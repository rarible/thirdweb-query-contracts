import { expect } from "chai";
import { ethers } from "hardhat";
import "@nomicfoundation/hardhat-toolbox";


import {DropERC721Reader} from "../typechain-types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ThirdwebSDK} from "@thirdweb-dev/sdk";

const { mine } = require("@nomicfoundation/hardhat-network-helpers");

describe("Test Erc721 Reader", function () {
  let erc721Reader: DropERC721Reader;
  let owner: SignerWithAddress;
  let sdk: ThirdwebSDK;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    erc721Reader = (await ethers.deployContract(
      "DropERC721Reader",
        owner
    )) as any
    console.log(erc721Reader.address)
     this.sdk = ThirdwebSDK.fromPrivateKey(
        process.env.PRIVATE_KEY!, // Your wallet's private key (only required for write operations)
        "polygon",
        {
          clientId: process.env.THIRDWEB_CLIENT_ID, // Use client id if using on the client side, get it from dashboard settings
          secretKey: process.env.THIRDWEB_SECRET, // Use secret key if using on the server, get it from dashboard settings
        },
    );

  });

  describe("reader test", function () {
    it("can read blue beetle", async function () {
      const collectionAddress = "0x0Fe7B48225f2c7E24952747F5D644Ba9937a199E"
      const claimData = await erc721Reader.getClaimIllegebilityData(collectionAddress, owner.address)
      console.log(JSON.stringify(claimData))
      const contract = sdk.getContract(collectionAddress, "nft-drop")

    });
  });
});
