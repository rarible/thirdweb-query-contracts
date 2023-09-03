
/**
 * For any claim conditions that a particular wallet is violating,
 * this function returns human readable information about the
 * breaks in the condition that can be used to inform the user.
 *
 * @param quantity - The desired quantity that would be claimed.
 * @param addressToCheck - The wallet address, defaults to the connected wallet.
 *
 */
import {
    ClaimCondition,
    ClaimEligibility, ClaimVerification,
    fetchSnapshotEntryForAddress,
    includesErrorMessage, normalizePriceValue,
    SnapshotEntryWithProof, ThirdwebSDK
} from "@thirdweb-dev/sdk";
import {BigNumber, ethers, utils} from "ethers";
import {DropERC721Reader} from "../typechain-types";
import {DropERC721} from "../typechain-types";
import {IClaimCondition} from "../typechain-types/contracts/drop-reader/DropERC721Reader";
import {ThirdwebStorage} from "@thirdweb-dev/storage";
import { AddressZero } from "@ethersproject/constants";

async function getClaimerProofs(
    claimerAddress: string,
    claimCondition: IClaimCondition.ClaimConditionStructOutput,
    merkleRootArray: Uint8Array,
    collectionUri: string,
    storage: ThirdwebStorage,
    sdk: ThirdwebSDK
): Promise<SnapshotEntryWithProof | null> {
    const merkleRoot = claimCondition.merkleRoot;
    if (merkleRootArray.length > 0) {
        const metadata = await storage.downloadJSON(collectionUri);
        return await fetchSnapshotEntryForAddress(
            claimerAddress,
            merkleRoot.toString(),
            metadata.merkle,
            sdk.getProvider(),
            storage,
            2,
        );
    } else {
        return null;
    }
}

export function prepareClaim(
    addressToClaim: string,
    quantity: number,
    activeClaimCondition: IClaimCondition.ClaimConditionStructOutput,
    snapshotEntry: SnapshotEntryWithProof
): ClaimVerification {
    let maxClaimable = BigNumber.from(0);
    let proofs = [utils.hexZeroPad([0], 32)];
    let priceInProof: BigNumber | undefined = snapshotEntry.price ? BigNumber.from(snapshotEntry.price) : undefined; // the price to send to the contract in claim proofs
    let currencyAddressInProof = snapshotEntry.currencyAddress;
    try {


            if (snapshotEntry) {
                proofs = snapshotEntry.proof;
                // override only if not default values (unlimited for quantity, zero addr for currency)
                maxClaimable =
                    snapshotEntry.maxClaimable === "unlimited"
                        ? ethers.constants.MaxUint256
                        : BigNumber.from(snapshotEntry.maxClaimable);
                priceInProof =
                    snapshotEntry.price === undefined ||
                    snapshotEntry.price === "unlimited"
                        ? ethers.constants.MaxUint256
                        : ethers.utils.parseEther(snapshotEntry.price);
                currencyAddressInProof =
                    snapshotEntry.currencyAddress || ethers.constants.AddressZero;
            }

    } catch (e) {
        // have to handle the valid error case that we *do* want to throw on
        if ((e as Error)?.message === "No claim found for this address") {
            throw e;
        }
        // other errors we wanna ignore and try to continue
        console.warn(
            "failed to check claim condition merkle root hash, continuing anyways",
            e,
        );
    }

    // the actual price to check allowance against
    // if proof price is unlimited, then we use the price from the claim condition
    // this mimics the contract behavior
    if(!priceInProof) {
        priceInProof = BigNumber.from(0)
    } 
    const pricePerToken =
        priceInProof.toString() !== ethers.constants.MaxUint256.toString()
            ? priceInProof
            : activeClaimCondition.pricePerToken;
    // same for currency address
    if(!currencyAddressInProof) {
        currencyAddressInProof = ethers.constants.AddressZero
    }

    const currencyAddress =
        currencyAddressInProof !== ethers.constants.AddressZero
            ? currencyAddressInProof
            : activeClaimCondition.currency;

    return {
        overrides: {blockTag: undefined, from: addressToClaim},
        proofs,
        maxClaimable,
        price: pricePerToken,
        currencyAddress: currencyAddress,
        priceInProof,
        currencyAddressInProof,
    };
}


export async function  getClaimIneligibilityReasons(
    erc721Reader: DropERC721Reader,
    erc721: DropERC721,
    quantity: number,
    storage: ThirdwebStorage,
    sdk: ThirdwebSDK,
    addressToCheck?: string
): Promise<ClaimEligibility | null>   {
    let activeConditionIndex: BigNumber;

    // if we have been unable to get a signer address, we can't check eligibility, so return a NoWallet error reason
    if (!addressToCheck) {
        return ClaimEligibility.NoWallet;
    }

    try {
        const illegebilityData = await erc721Reader.getClaimIllegebilityData(erc721.address, addressToCheck)
        if(illegebilityData.conditions.length == 0) {
            return ClaimEligibility.NoClaimConditionSet;
        }
        activeConditionIndex = illegebilityData.activeClaimConditionIndex
        const claimCondition = illegebilityData.conditions[activeConditionIndex.toNumber()] as IClaimCondition.ClaimConditionStructOutput

        if (claimCondition.startTimestamp.gt(illegebilityData.globalData.blockTimeStamp)) {
            return ClaimEligibility.ClaimPhaseNotStarted;
        }

        if ((claimCondition.maxClaimableSupply.sub(claimCondition.supplyClaimed)).lt(quantity)) {
            return ClaimEligibility.NotEnoughSupply;
        }

        if (illegebilityData.globalData.totalMinted.add(quantity).gt(illegebilityData.globalData.nextTokenIdToMint)) {
            return ClaimEligibility.NotEnoughSupply;
        }

        // check for merkle root inclusion
        const merkleRootArray = utils.stripZeros(claimCondition.merkleRoot);
        const hasAllowList = merkleRootArray.length > 0;
        let allowListEntry: SnapshotEntryWithProof | null = null;
        if (hasAllowList) {
            allowListEntry = await getClaimerProofs(
                addressToCheck,
                claimCondition,
                merkleRootArray,
                illegebilityData.globalData.contractURI,
                storage,
                sdk);

            if(!allowListEntry) {
                return ClaimEligibility.AddressNotAllowed;
            }

            if (
                claimCondition.quantityLimitPerWallet.gt(0) &&
                BigNumber.from(allowListEntry.maxClaimable).lt(illegebilityData.globalData.claimedByUser.add(quantity))
            ) {
                return ClaimEligibility.OverMaxClaimablePerWallet;
            }

            if (allowListEntry) {
                try {
                    const claimVerification = prepareClaim(
                        addressToCheck,
                        quantity,
                        claimCondition,
                        allowListEntry)

                    await erc721.verifyClaim(activeConditionIndex,
                        addressToCheck,
                        quantity,
                        claimCondition.currency,
                        claimCondition.pricePerToken,
                        {
                        proof: claimVerification.proofs,
                        quantityLimitPerWallet: claimVerification.maxClaimable,
                        currency: claimVerification.currencyAddressInProof,
                        pricePerToken: claimVerification.priceInProof
                    })
                } catch (e: any) {
                    console.warn(
                        "Merkle proof verification failed:",
                        "reason" in e ? e.reason : e,
                    );
                    const reason = (e as any).reason;
                    switch (reason) {
                        case "!Qty":
                            return ClaimEligibility.OverMaxClaimablePerWallet;
                        case "!PriceOrCurrency":
                            return ClaimEligibility.WrongPriceOrCurrency;
                        case "!MaxSupply":
                            return ClaimEligibility.NotEnoughSupply;
                        case "cant claim yet":
                            return ClaimEligibility.ClaimPhaseNotStarted;
                        default: {
                            return ClaimEligibility.AddressNotAllowed;
                        }
                    }
                }
            }

            // public phase without allow list
        } else {
            // check quantity
            if(claimCondition.quantityLimitPerWallet.lt(quantity)) {
                return ClaimEligibility.OverMaxClaimablePerWallet;
            }
            // check value
            if (claimCondition.pricePerToken.gt(0)) {
                const totalPrice = claimCondition.pricePerToken.mul(quantity);
                if(illegebilityData.globalData.userBalance.lt(totalPrice)) {
                    return ClaimEligibility.NotEnoughTokens;
                }
            }
        }
    } catch (err: any) {
        if (
            includesErrorMessage(err, "!CONDITION") ||
            includesErrorMessage(err, "no active mint condition")
        ) {
            return ClaimEligibility.NoClaimConditionSet;
        }
        console.warn("failed to get active claim condition", err);
        return ClaimEligibility.Unknown;
    }

    return null;
}