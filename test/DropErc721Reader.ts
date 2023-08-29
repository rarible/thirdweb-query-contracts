import { expect } from "chai";
import { ethers } from "hardhat";
import "@nomicfoundation/hardhat-toolbox";
import { network } from "hardhat"

import {DropERC721Reader, DropERC721Reader__factory} from "../typechain-types";
import {DropERC721, DropERC721__factory} from "../typechain-types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ClaimEligibility, ThirdwebSDK} from "@thirdweb-dev/sdk";
import {ThirdwebStorage} from "@thirdweb-dev/storage";
import {getClaimIneligibilityReasons} from "../utils/claim-checker";
import { assert } from "console";

const { mine } = require("@nomicfoundation/hardhat-network-helpers");

describe("Test Erc721 Reader", function () {
  let erc721Reader: DropERC721Reader;
  let owner: SignerWithAddress;
  let sdk: ThirdwebSDK;
  let storage: ThirdwebStorage

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    erc721Reader = await DropERC721Reader__factory.connect("0xCBeD96776B9b7b4b6daBa8A2EE90C0cF26b97665", owner)
    console.log(erc721Reader.address)
    sdk = ThirdwebSDK.fromSigner(
         owner, // Your wallet's private key (only required for write operations)
        "polygon",
        {
          clientId: process.env.THIRDWEB_CLIENT_ID, // Use client id if using on the client side, get it from dashboard settings
          secretKey: process.env.THIRDWEB_SECRET, // Use secret key if using on the server, get it from dashboard settings
        },
    );
    storage = new ThirdwebStorage({
      clientId: process.env.THIRDWEB_CLIENT_ID, // Use client id if using on the client side, get it from dashboard settings
      secretKey: process.env.THIRDWEB_SECRET, // Use secret key if using on the server, get it from dashboard settings
    });

  });

  describe("reader test", function () {
    it("There is no claim condition set.", async function () {
      const collectionAddress = "0x0Fe7B48225f2c7E24952747F5D644Ba9937a199E"
      const erc721Drop = DropERC721__factory.connect(collectionAddress, owner)
      const claimData = await erc721Reader.getClaimIllegebilityData(collectionAddress, owner.address)
      console.log(JSON.stringify(claimData))
      const contract = await sdk.getContract(collectionAddress, "nft-drop")
      const claimReason = await getClaimIneligibilityReasons(erc721Reader, erc721Drop, collectionAddress, 1, storage, sdk, owner.address)
      console.log(claimReason)
      assert(claimReason == ClaimEligibility.NoClaimConditionSet)
    });
    
    it("This address is not on the allowlist.", async function () {
      const collectionAddress = "0xA00412829A4fFB09b5a85042941f8EC4B2F385cA"
      const erc721Drop = DropERC721__factory.connect(collectionAddress, owner)
      const claimData = await erc721Reader.getClaimIllegebilityData(collectionAddress, owner.address)
      console.log(JSON.stringify(claimData))
      const contract = await sdk.getContract(collectionAddress, "nft-drop")
      const res = await contract.erc721.claimConditions.getClaimIneligibilityReasons(1, owner.address)
      const claimReason = await getClaimIneligibilityReasons(erc721Reader, erc721Drop, collectionAddress, 1, storage, sdk, owner.address)
      console.log(claimReason)
      assert(claimReason == ClaimEligibility.AddressNotAllowed)
    });

    // NotEnoughSupply = "There is not enough supply to claim.",
    // WaitBeforeNextClaimTransaction = "Not enough time since last claim transaction. Please wait.",
    // ClaimPhaseNotStarted = "Claim phase has not started yet.",
    // AlreadyClaimed = "You have already claimed the token.",
    // WrongPriceOrCurrency = "Incorrect price or currency.",
    // OverMaxClaimablePerWallet = "Cannot claim more than maximum allowed quantity.",
    // NotEnoughTokens = "There are not enough tokens in the wallet to pay for the claim.",
    // NoActiveClaimPhase = "There is no active claim phase at the moment. Please check back in later.",
    // NoWallet = "No wallet connected.",
    // Unknown = "No claim conditions found."

    it("Cannot claim more than maximum allowed quantity.", async function () {
      const collectionAddress = "0x19cFE5f37024B2f4E48Ee090897548A48C88237C"
      const erc721Drop = DropERC721__factory.connect(collectionAddress, owner)
      const claimData = await erc721Reader.getClaimIllegebilityData(collectionAddress, owner.address)
      console.log(JSON.stringify(claimData))
      const contract = await sdk.getContract(collectionAddress, "nft-drop")
      const res = await contract.erc721.claimConditions.getClaimIneligibilityReasons(4, owner.address)
      const claimReason = await getClaimIneligibilityReasons(erc721Reader, erc721Drop, collectionAddress, 4, storage, sdk, owner.address)
      console.log(claimReason)
      assert(claimReason == ClaimEligibility.OverMaxClaimablePerWallet)
    });

    it("qty exceed for collection(all minted)", async function () {

    });

    it("qty exceed for public mint(max per wallet)", async function () {

    });

    it("not enought money", async function () {

    });

    it("can claim public", async function () {

    });

    it("can claim private", async function () {
      const collectionAddress = "0x19cFE5f37024B2f4E48Ee090897548A48C88237C"
      const erc721Drop = DropERC721__factory.connect(collectionAddress, owner)
      const claimData = await erc721Reader.getClaimIllegebilityData(collectionAddress, owner.address)
      console.log(JSON.stringify(claimData))
      const contract = await sdk.getContract(collectionAddress, "nft-drop")
      const res = await contract.erc721.claimConditions.getClaimIneligibilityReasons(3, owner.address)
      const claimReason = await getClaimIneligibilityReasons(erc721Reader, erc721Drop, collectionAddress, 3, storage, sdk, owner.address)
      console.log(claimReason)
      assert(claimReason == null)
    });
  });
});
