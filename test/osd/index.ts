import { expect } from "chai";
import { ethers } from "hardhat";
import { IDeployedPayload } from "../interfaces";

export function testOSD(payload: IDeployedPayload) {

    it("decimal", async () => {
        const decimal = await payload.nativeToken.decimals();
        expect(decimal).equal(18);
    })

    it("symbol", async () => {
        const symbol = await payload.nativeToken.symbol();
        expect(symbol).equal('OSD');
    })

    it("name", async () => {
        const name = await payload.nativeToken.name();
        expect(name).equal('OSDevCoin');
    })

    it('mint token to owner', async () => {
        const oneToken = ethers.BigNumber.from(10).pow(18);
        const amount = oneToken.mul('10000000000'); // 10 billion
        const nativeToken = payload.nativeToken;

        const devCoin = payload.nativeToken.mint(payload.deployer.address, amount);

        await expect(devCoin).emit(nativeToken, 'Transfer').withArgs(
            ethers.constants.AddressZero, payload.deployer.address, amount
        )

        const gwei = ethers.BigNumber.from(10).pow(13);

        const star = 10000;
        const fork = 100;

        const worth = gwei.mul(star * 4).add(gwei.mul(fork * 2));

        console.log('no of projects mint', worth, ethers.BigNumber.from(10).pow(18).div(worth));

        const balance = await nativeToken.balanceOf(payload.deployer.address);
        expect(balance).equal(amount);
    })

    const oneToken = ethers.BigNumber.from(10).pow(18);

    describe('transfer', () => {

        it('fail', async () => {
            const nativeToken = payload.nativeToken;
            const user = payload.signer2.address;
            const tx = nativeToken.connect(payload.signer3).transfer(user, oneToken);
            await expect(tx).to.revertedWith(`ERC20: transfer amount exceeds balance`);
        })

        it('estimatGas', async () => {
            const nativeToken = payload.nativeToken;
            const user = payload.signer2.address;
            const gas = await nativeToken.estimateGas.transfer(user, oneToken);

            expect(gas).equal(59975);
        })

        it('success', async () => {
            const nativeToken = payload.nativeToken;
            const user = payload.signer2.address;
            const beforeBalance = await nativeToken.balanceOf(user);
            const tx = nativeToken.transfer(user, oneToken);

            await expect(tx).to.emit(nativeToken, 'Transfer').withArgs(
                payload.deployer.address, user, oneToken.toString()
            )

            const afterBalance = await nativeToken.balanceOf(user);
            expect(afterBalance).equal(beforeBalance.add(oneToken));
        })
    })

    describe("batch transfer", () => {

        it('batchTransfer users length is more than amounts', async () => {
            const nativeToken = payload.nativeToken;
            const user1 = payload.signer3.address;
            const user2 = payload.signer4.address;
            const tx = nativeToken.batchTransfer(
                [user1, user2],
                [oneToken]
            );

            await expect(tx).to.be.revertedWith(`Invalid input parameters`)
        });

        it('batchTransfer users length is less than amounts', async () => {
            const nativeToken = payload.nativeToken;
            const user1 = payload.signer3.address;
            const user2 = payload.signer4.address;
            const tx = nativeToken.batchTransfer(
                [user1],
                [oneToken, oneToken]
            );

            await expect(tx).to.be.revertedWith(`Invalid input parameters`)
        });

        it('estimategasg', async () => {
            const nativeToken = payload.nativeToken;
            const user1 = payload.signer3.address;
            const user2 = payload.signer4.address;

            const twoToken = oneToken.mul(2);
            const gas = await nativeToken.estimateGas.batchTransfer(
                [user1, user2],
                [oneToken, twoToken]
            );

            expect(gas).equal(87827);
        });

        it('batchTransfer', async () => {
            const nativeToken = payload.nativeToken;
            const user1 = payload.signer3.address;
            const user2 = payload.signer4.address;

            const beforeBalance1 = await nativeToken.balanceOf(user1);
            const beforeBalance2 = await nativeToken.balanceOf(user2);
            const twoToken = oneToken.mul(2);
            const tx = nativeToken.batchTransfer(
                [user1, user2],
                [oneToken, twoToken]
            );

            await expect(tx).to.emit(nativeToken, 'Transfer').withArgs(
                payload.deployer.address, user1, oneToken.toString()
            )
            await expect(tx).to.emit(nativeToken, 'Transfer').withArgs(
                payload.deployer.address, user2, twoToken.toString()
            )

            const afterBalance1 = await nativeToken.balanceOf(user1);
            const afterBalance2 = await nativeToken.balanceOf(user2);

            expect(afterBalance1).equal(beforeBalance1.add(oneToken));
            expect(afterBalance2).equal(beforeBalance2.add(twoToken));
        })

        it('batchTransfer fail', async () => {
            const nativeToken = payload.nativeToken;
            const user1 = payload.signer3.address;
            const user2 = payload.signer4.address;

            const beforeBalance1 = await nativeToken.balanceOf(user1);
            const beforeBalance2 = await nativeToken.balanceOf(user2);

            const tx = nativeToken.connect(payload.signer2).batchTransfer(
                [user1, user2],
                [oneToken, oneToken.add(5)]
            );

            await expect(tx).to.rejectedWith(`ERC20: transfer amount exceeds balance`);

            const afterBalance1 = await nativeToken.balanceOf(user1);
            const afterBalance2 = await nativeToken.balanceOf(user2);

            expect(afterBalance1).equal(beforeBalance1);
            expect(afterBalance2).equal(beforeBalance2);
        })

    })

    describe("addDefaultOperator", async () => {
        it('by not owner', async () => {
            const nativeToken = payload.nativeToken;
            const tx = nativeToken.connect(payload.operator).addDefaultOperator(payload.signer2.address);
            await expect(tx).to.revertedWith(`Ownable: caller is not the owner`)
        })

        it('by owner', async () => {
            const nativeToken = payload.nativeToken;
            const operator = payload.operator.address;
            const tx = nativeToken.connect(payload.deployer).addDefaultOperator(operator);
            await expect(tx).to.emit(nativeToken, 'DefaultOperatorAdded').withArgs(
                operator
            );
        })
    })
}
