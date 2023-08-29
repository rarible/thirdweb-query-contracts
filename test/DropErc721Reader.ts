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

    erc721Reader = await DropERC721Reader__factory.connect("0x7F2369bbA52dFE198d9D3c93Ac12874a78652680", owner)
    console.log(erc721Reader.address)
    this.sdk = ThirdwebSDK.fromSigner(
         owner, // Your wallet's private key (only required for write operations)
        "polygon",
        {
          clientId: process.env.THIRDWEB_CLIENT_ID, // Use client id if using on the client side, get it from dashboard settings
          secretKey: process.env.THIRDWEB_SECRET, // Use secret key if using on the server, get it from dashboard settings
        },
    );
    this.storage = new ThirdwebStorage({
      clientId: process.env.THIRDWEB_CLIENT_ID, // Use client id if using on the client side, get it from dashboard settings
      secretKey: process.env.THIRDWEB_SECRET, // Use secret key if using on the server, get it from dashboard settings
    });

  });

  describe("reader test", function () {
    it("can read blue beetle", async function () {
      const collectionAddress = "0x0Fe7B48225f2c7E24952747F5D644Ba9937a199E"
      const erc721Drop = DropERC721__factory.connect(collectionAddress, owner)
      const claimData = await erc721Reader.getClaimIllegebilityData(collectionAddress, owner.address)
      console.log(JSON.stringify(claimData))
      const contract = sdk.getContract(collectionAddress, "nft-drop")
      const claimReason = await getClaimIneligibilityReasons(erc721Reader, erc721Drop, collectionAddress, 1, storage, sdk, owner.address)
      console.log(claimReason)
    });
  });
});
