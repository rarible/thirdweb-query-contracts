
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
    ClaimEligibility,
    fetchSnapshotEntryForAddress,
    includesErrorMessage,
    SnapshotEntryWithProof, ThirdwebSDK
} from "@thirdweb-dev/sdk";
import {BigNumber, utils} from "ethers";
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
        // console.log("fetchSnapshotEntryForAddress",
        //     claimerAddress,
        //     merkleRoot.toString(),
        //     metadata.merkle,
        //     sdk.getProvider(),
        //     storage,
        //     2)
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

export async function  getClaimIneligibilityReasons(
    erc721Reader: DropERC721Reader,
    erc721: DropERC721,
    collectionAddress: string,
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
        const illegebilityData = await erc721Reader.getClaimIllegebilityData(collectionAddress, addressToCheck)
        if(illegebilityData.conditions.length == 0) {
            return ClaimEligibility.NoClaimConditionSet;
        }
        activeConditionIndex = illegebilityData.activeClaimConditionIndex
        const claimCondition = illegebilityData.conditions[activeConditionIndex.toNumber()]

        if ((claimCondition.maxClaimableSupply.sub(claimCondition.supplyClaimed)).lt(quantity)) {
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
                claimCondition.quantityLimitPerWallet.lt(illegebilityData.globalData.claimedByUser.add(quantity)) ||
                BigNumber.from(allowListEntry.maxClaimable).lt(illegebilityData.globalData.claimedByUser.add(quantity))
            ) {
                return ClaimEligibility.OverMaxClaimablePerWallet;
            }

            if (allowListEntry) {
                try {
                    const currencyAddress = allowListEntry.currencyAddress || AddressZero
                    const price = BigNumber.from(allowListEntry.price)
                    await erc721.verifyClaim(activeConditionIndex, addressToCheck, quantity, currencyAddress, price, {
                        proof: allowListEntry.proof,
                        quantityLimitPerWallet: allowListEntry.maxClaimable,
                        currency: currencyAddress,
                        pricePerToken: price
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