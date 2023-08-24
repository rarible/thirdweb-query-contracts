
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
import {IClaimCondition} from "../typechain-types/contracts/drop-reader/DropERC721Reader";

// TODO rewrite
// async function getClaimerProofs(
//     claimerAddress: string,
//     claimCondition: IClaimCondition.ClaimConditionStructOutput,
//     merkleRootArray: Uint8Array,
//     collectionUri: string,
//     storage: ThirdwebStorage
// ): Promise<SnapshotEntryWithProof | null> {
//     claimCondition.metadata.
//     const merkleRoot = claimCondition.merkleRoot;
//     if (merkleRootArray.length > 0) {
//         const metadata = await storage.downloadJSON(collectionUri);
//         return await fetchSnapshotEntryForAddress(
//             claimerAddress,
//             merkleRoot.toString(),
//             metadata.merkle,
//             this.contractWrapper.getProvider(),
//             this.storage,
//             this.getSnapshotFormatVersion(),
//         );
//     } else {
//         return null;
//     }
// }

export async function  getClaimIneligibilityReasons(
    erc721Reader: DropERC721Reader,
    collectionAddress: string,
    quantity: BigNumber,
    addressToCheck?: string,
    sdk: ThirdwebSDK
): Promise<ClaimEligibility | null>   {
    let reason: ClaimEligibility = null;
    let activeConditionIndex: BigNumber;
    let claimCondition: ClaimCondition;

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
            // TODO
            allowListEntry = await sdk.getClaimerProofs(addressToCheck);

            if(!allowListEntry) {
                return ClaimEligibility.AddressNotAllowed;
            }

            if (allowListEntry) {
                try {
                    // TODO
                    await this.contractWrapper.readContract.verifyClaim(
                        activeConditionIndex,
                        resolvedAddress,
                        quantity,
                        claimVerification.currencyAddress,
                        claimVerification.price,
                        {
                            proof: claimVerification.proofs,
                            quantityLimitPerWallet: claimVerification.maxClaimable,
                            currency: claimVerification.currencyAddressInProof,
                            pricePerToken: claimVerification.priceInProof,
                        } as IDropSinglePhase.AllowlistProofStruct,
                    );
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

// TODO check qty
if (
    this.isNewSinglePhaseDrop(this.contractWrapper) ||
    this.isNewMultiphaseDrop(this.contractWrapper)
) {
    let claimedSupply = BigNumber.from(0);
    let maxClaimable = convertQuantityToBigNumber(
        claimCondition.maxClaimablePerWallet,
        decimals,
    );

    try {
        claimedSupply = await this.getSupplyClaimedByWallet(resolvedAddress);
    } catch (e) {
        // no-op
    }

    if (allowListEntry) {
        maxClaimable = convertQuantityToBigNumber(
            allowListEntry.maxClaimable,
            decimals,
        );
    }

    if (
        maxClaimable.gt(0) &&
        maxClaimable.lt(claimedSupply.add(quantityWithDecimals))
    ) {
        reasons.push(ClaimEligibility.OverMaxClaimablePerWallet);
        return reasons;
    }

    // if there is no allowlist, or if there is an allowlist and the address is not in it
    // if maxClaimable is 0, we consider it as the address is not allowed
    if (!hasAllowList || (hasAllowList && !allowListEntry)) {
        if (maxClaimable.lte(claimedSupply) || maxClaimable.eq(0)) {
            reasons.push(ClaimEligibility.AddressNotAllowed);
            return reasons;
        }
    }
}

// TODO check price
// if not within a browser conetext, check for wallet balance.
// In browser context, let the wallet do that job
if (claimCondition.price.gt(0) && isNode()) {
    const totalPrice = claimCondition.price.mul(BigNumber.from(quantity));
    const provider = this.contractWrapper.getProvider();
    if (isNativeToken(claimCondition.currencyAddress)) {
        const balance = await provider.getBalance(resolvedAddress);
        if (balance.lt(totalPrice)) {
            reasons.push(ClaimEligibility.NotEnoughTokens);
        }
    } else {
        const erc20 = new ContractWrapper<IERC20>(
            provider,
            claimCondition.currencyAddress,
            ERC20Abi,
            {},
            this.storage,
        );
        const balance = await erc20.readContract.balanceOf(resolvedAddress);
        if (balance.lt(totalPrice)) {
            reasons.push(ClaimEligibility.NotEnoughTokens);
        }
    }
}

return reasons;
}