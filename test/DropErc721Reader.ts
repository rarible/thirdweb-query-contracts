import { expect } from "chai";
import { ethers } from "hardhat";
import "@nomicfoundation/hardhat-toolbox";
import { network } from "hardhat"

import {DropERC721Reader, DropERC721Reader__factory} from "../typechain-types";
import {DropERC721, DropERC721__factory} from "../typechain-types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ThirdwebSDK} from "@thirdweb-dev/sdk";
import {ThirdwebStorage} from "@thirdweb-dev/storage";
import {getClaimIneligibilityReasons} from "../utils/claim-checker";

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
    it("no claim condition", async function () {
      const collectionAddress = "0x0Fe7B48225f2c7E24952747F5D644Ba9937a199E"
      const erc721Drop = DropERC721__factory.connect(collectionAddress, owner)
      const claimData = await erc721Reader.getClaimIllegebilityData(collectionAddress, owner.address)
      console.log(JSON.stringify(claimData))
      const contract = sdk.getContract(collectionAddress, "nft-drop")
      const claimReason = await getClaimIneligibilityReasons(erc721Reader, erc721Drop, collectionAddress, 1, storage, sdk, owner.address)
      console.log(claimReason)
    });

    it("not in a whitelist", async function () {

    });

    it("qty exceed for whitelist", async function () {

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

    });
  });
});
