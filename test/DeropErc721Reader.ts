import { expect } from "chai";
import { ethers } from "hardhat";
import "@nomicfoundation/hardhat-toolbox";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {DropERC721Reader} from "../typechain-types";
import {DropERC721Reader__factory} from "../typechain-types";

const { mine } = require("@nomicfoundation/hardhat-network-helpers");

describe("Test Erc721 Reader", function () {
  let erc721Reader: DropERC721Reader;
  let owner: SignerWithAddress;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    erc721Reader = (await ethers.deployContract(
      "DropERC721Reader",
        owner
    )) as any
    console.log(await erc721Reader.getAddress())

  });

  describe("reader test", function () {
    it("can read blue beetle", async function () {
      const bleuBeetleAddress = "0x0Fe7B48225f2c7E24952747F5D644Ba9937a199E"
      const claimData = await erc721Reader.getClaimIllegebilityData(bleuBeetleAddress, owner.address)
      const jsonData = JSON.parse(JSON.stringify(claimData, (key, value) =>
          typeof value === 'bigint'
              ? value.toString()
              : value // return everything else unchanged
      ));
      console.log(jsonData)
    });
  });
});
