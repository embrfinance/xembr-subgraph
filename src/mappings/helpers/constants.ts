import { BigDecimal, BigInt, Address, dataSource } from '@graphprotocol/graph-ts';

export let ZERO = BigInt.fromI32(0);
export let ZERO_BD = BigDecimal.fromString('0');
export let ONE_BD = BigDecimal.fromString('1');
export let MIN_VIABLE_LIQUIDITY = BigDecimal.fromString('0.01');
export let REDEMPTION_INDEX = BigInt.fromString("115792089237316195423570985008687907853269984665640564039457584007913129639935")

export let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export enum CooldownEvent {
    COOLDOWN,
    EXIT,
    WITHDRAW,
  }

export class AddressByNetwork {
  public mainnet: string;
  public kovan: string;
  public goerli: string;
  public rinkeby: string;
  public polygon: string;
  public fuji: string;
  public fantom: string;
  public arbitrum: string;
  public avalanche: string;
  public dev: string;
}

let network: string = dataSource.network();

let vaultAddressByNetwork: AddressByNetwork = {
  mainnet: '0x9aed52F3074ba468c6ad17822b8833210868c31b',
  kovan: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  goerli: '0x65748E8287Ce4B9E6D83EE853431958851550311',
  rinkeby: '0xF07513C68C55A31337E3b58034b176A15Dce16eD',
  polygon: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  fuji: '0x9aed52F3074ba468c6ad17822b8833210868c31b',
  arbitrum: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  dev: '0xa0B05b20e511B1612E908dFCeE0E407E22B76028',
  fantom: '0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce',
  avalanche: '0xad68ea482860cd7077a5D0684313dD3a9BC70fbB'
};

let xEmbrAddressByNetwork: AddressByNetwork = {
    mainnet: '0xd91cb6c5b14C2308541b9147130eCeb1F6d60682',
    kovan: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    goerli: '0x65748E8287Ce4B9E6D83EE853431958851550311',
    rinkeby: '0xF07513C68C55A31337E3b58034b176A15Dce16eD',
    polygon: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    fuji: '0xd91cb6c5b14C2308541b9147130eCeb1F6d60682',
    arbitrum: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    dev: '0xa0B05b20e511B1612E908dFCeE0E407E22B76028',
    fantom: '0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce',
    avalanche: '0xd91cb6c5b14C2308541b9147130eCeb1F6d60682'
  };

  let embrAddressByNetwork: AddressByNetwork = {
    mainnet: '0x6036617225ded90fCD43cb20731D0E41BcF4e3f0',
    kovan: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    goerli: '0x65748E8287Ce4B9E6D83EE853431958851550311',
    rinkeby: '0xF07513C68C55A31337E3b58034b176A15Dce16eD',
    polygon: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    fuji: '0x6036617225ded90fCD43cb20731D0E41BcF4e3f0',
    arbitrum: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    dev: '0xa0B05b20e511B1612E908dFCeE0E407E22B76028',
    fantom: '0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce',
    avalanche: '0x6036617225ded90fCD43cb20731D0E41BcF4e3f0'
  };

function forNetwork(addressByNetwork: AddressByNetwork, network: string): Address {
  if (network == 'mainnet') {
    return Address.fromString(addressByNetwork.mainnet);
  } else if (network == 'kovan') {
    return Address.fromString(addressByNetwork.kovan);
  } else if (network == 'goerli') {
    return Address.fromString(addressByNetwork.goerli);
  } else if (network == 'rinkeby') {
    return Address.fromString(addressByNetwork.rinkeby);
  } else if (network == 'matic') {
    return Address.fromString(addressByNetwork.polygon);
  } else if (network == 'fuji') {
    return Address.fromString(addressByNetwork.fuji);
  } else if (network == 'fantom') {
    return Address.fromString(addressByNetwork.fantom);
  } else if (network == 'arbitrum-one') {
    return Address.fromString(addressByNetwork.arbitrum);
  } else if (network == 'avalanche') {
    return Address.fromString(addressByNetwork.avalanche);
  } else {
    return Address.fromString(addressByNetwork.dev);
  }
}

export let VAULT_ADDRESS = forNetwork(vaultAddressByNetwork, network);
export let XEMBR_ADDRESS = forNetwork(xEmbrAddressByNetwork, network);
export let EMBR_ADDRESS = forNetwork(embrAddressByNetwork, network)

//export let PRICING_ASSETS: Address[] = [WETH, WBTC, USDC, DAI, BAL, MIM, AUSD];
//export let USD_STABLE_ASSETS: Address[] = [USDC, DAI, AUSD, MIM];
