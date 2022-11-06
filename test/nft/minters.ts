// import { expect } from "chai";
// import { IDeployedPayload } from "../interfaces";

// export function testMinters(payload: IDeployedPayload) {

//     it('is minter', async () => {
//         const tx = await payload.nft.isMinter(payload.deployer.address);

//         await expect(tx).equal(false);
//     })

//     it('add minter', async () => {
//         const tx = payload.nft.addMinter(payload.deployer.address);

//         await expect(tx).emit(payload.nft, 'MinterAdded').withArgs(
//             payload.deployer.address
//         );
//     });

//     it('add minter other than owner', async () => {
//         const tx = payload.nft.connect(payload.signer2).addMinter(payload.deployer.address);

//         await expect(tx).revertedWith('Ownable: caller is not the owner')
//     });

//     it('remove minter', async () => {
//         let tx = payload.nft.addMinter(payload.signer2.address);

//         await expect(tx).emit(payload.nft, 'MinterAdded').withArgs(
//             payload.signer2.address
//         );

//         tx = payload.nft.removeMinter(payload.signer2.address);

//         await expect(tx).emit(payload.nft, 'MinterRemoved').withArgs(
//             payload.signer2.address
//         );


//     });

//     it('remove minter other than owner', async () => {
//         const tx = payload.nft.connect(payload.signer2).removeMinter(payload.deployer.address);

//         await expect(tx).revertedWith('Ownable: caller is not the owner')
//     });
// }