import React, { useState, useEffect } from 'react'
import { BigNumber } from 'ethers'
import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import {
  connectWallet,
  getCurrentWalletConnected,
  getContract,
} from './utils/interact'
import { whiteList } from './constants/whitelist'
import './App.css'

function App() {
  const [walletAddress, setWalletAddress] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setMintLoading] = useState(false)
  const [curPhase, setCurPhase] = useState(0)
  const [auctionPrice, setAuctionPrice] = useState('')
  const [presalePrice, setPresalePrice] = useState('')
  const [publicSalePrice, setPublicSalePrice] = useState('')
  const [totalSupply, setTotalSupply] = useState(0)
  const [curPrice, setCurPrice] = useState('')
  // const [presaleStatus, setPresaleStatus] = useState(false)
  // const [publicSaleStatus, setPublicSaleStatus] = useState(false)
  // const [maxMintSupply, setMaxMintSupply] = useState(0)
  // const [maxPresaleMints, setMaxPresaleMints] = useState(0)
  const [amount, setAmount] = useState(1)

  useEffect(() => {
    async function fetchWalletInfo() {
      const { address, status } = await getCurrentWalletConnected()
      setWalletAddress(address)
      setStatus(status)
    }
    fetchWalletInfo()
  }, [])

  useEffect(() => {
    async function fetchContractInfo() {
      let contract = getContract(walletAddress)
      let saleConfig
      try {
        saleConfig = await contract.saleConfig()
      } catch (error) {
        console.log(error)
      }
      if (
        saleConfig.auctionSaleStartTime !== 0 &&
        saleConfig.auctionSaleStartTime <= Math.floor(Date.now() / 1000)
      ) {
        setCurPhase(1)
        setAuctionPrice(
          await contract.getAuctionPrice(saleConfig.auctionSaleStartTime),
        )
        setCurPrice(
          Number(
            BigNumber.from(
              await contract.getAuctionPrice(saleConfig.auctionSaleStartTime),
            ).div(BigNumber.from(10 ** 15)),
          ) / 1000,
        )
      } else if (saleConfig.whitelistPrice !== 0) {
        setCurPhase(2)
        setPresalePrice(saleConfig.whitelistPrice)
        setCurPrice(
          Number(
            BigNumber.from(saleConfig.whitelistPrice).div(
              BigNumber.from(10 ** 15),
            ),
          ) / 1000,
        )
      } else if (
        await contract.isPublicSaleOn(
          saleConfig.publicPrice,
          saleConfig.publicSaleStartTime,
        )
      ) {
        setCurPhase(3)
        setPublicSalePrice(saleConfig.publicPrice)
        setCurPrice(
          Number(
            BigNumber.from(saleConfig.publicPrice).div(
              BigNumber.from(10 ** 15),
            ),
          ) / 1000,
        )
      } else {
        setCurPrice(0)
      }
      // setPresaleStatus(await contract.isPresaleActive())
      // setPublicSaleStatus(await contract.isPublicSaleActive())
      // setMaxMintSupply(Number(await contract.MAX_SUPPLY()))
      // setMaxPresaleMints(Number(await contract.MAX_PRESALE_MINTS()))
      setTotalSupply(BigNumber.from(await contract.totalSupply()).toNumber()) // original value * 1e5
      // setPresalePrice(BigNumber.from(await contract.PRESALE_PRICE()).toString())
      // setPublicSalePrice(
      //   BigNumber.from(await contract.PUBLIC_PRICE()).toString(),
      // )
    }
    fetchContractInfo()
  }, [loading, walletAddress])

  useEffect(() => {
    if (status) {
      notify()
      setStatus(null)
    }
    // eslint-disable-next-line
  }, [status])

  useEffect(() => {
    if (curPhase === 2) {
      setAmount(1)
    } else if (curPhase === 1 || curPhase === 3) {
      setAmount(5)
    } else {
      setAmount(0)
    }
  }, [curPhase])

  const whitelistAddresses = whiteList.map((addr) => {
    return addr.toLowerCase()
  })

  const changeAmount = (val) => {
    setAmount(val.nativeEvent.data)
  }

  const increaseAmount = () => {
    if (curPhase === 0) {
      setAmount(0)
    }
    if (curPhase === 1 || curPhase === 3) {
      if (amount < 5) setAmount(amount + 1)
    }
    if (curPhase === 2) {
      setAmount(1)
    }
  }

  const decreaseAmount = () => {
    if (amount > 1) setAmount(amount - 1)
  }

  const onClickConnectWallet = async () => {
    const walletResponse = await connectWallet()
    setStatus(walletResponse.status)
    setWalletAddress(walletResponse.address)
  }

  const onClickDisconnectWallet = async () => {
    setWalletAddress(null)
  }

  const handleMint = async () => {
    // let curTime = new Date().getTime()

    if (!walletAddress) {
      setStatus('Please connect your wallet!')
      return
    }

    const contract = getContract(walletAddress)
    setMintLoading(true)

    if (curPhase === 1) {
      try {
        let tx = await contract.auctionMint(amount, {
          value: BigNumber.from(auctionPrice).mul(amount),
        })
        let res = await tx.wait()
        if (res.transactionHash) {
          setStatus(`You minted ${amount} SON Successfully`)
          setMintLoading(false)
        }
      } catch (err) {
        console.log('mint error', err)
        let errorContainer =
          err.error && err.error.message ? err.error.message : ''
        let errorBody = errorContainer.substr(errorContainer.indexOf(':') + 1)
        let status =
          'Transaction failed because you have insufficient funds or sales not started'
        errorContainer.indexOf('execution reverted') === -1
          ? setStatus(status)
          : setStatus(errorBody)
        setMintLoading(false)
      }
    } else if (curPhase === 3) {
      try {
        let tx = await contract.publicSaleMint(amount, {
          value: BigNumber.from(publicSalePrice).mul(amount),
        })
        let res = await tx.wait()
        if (res.transactionHash) {
          setStatus(`You minted ${amount} SON Successfully`)
          setMintLoading(false)
        }
      } catch (err) {
        console.log('mint error', err)
        let errorContainer =
          err.error && err.error.message ? err.error.message : ''
        let errorBody = errorContainer.substr(errorContainer.indexOf(':') + 1)
        let status =
          'Transaction failed because you have insufficient funds or sales not started'
        errorContainer.indexOf('execution reverted') === -1
          ? setStatus(status)
          : setStatus(errorBody)
        setMintLoading(false)
      }
    } else if (curPhase === 2) {
      let index = whitelistAddresses.indexOf(walletAddress.toLowerCase())
      let hexProof
      const leafNodes = whiteList.map((addr) => keccak256(addr).toString('hex'))
      const merkleTree = new MerkleTree(leafNodes, keccak256, {
        sortPairs: true,
      })

      if (index === -1) {
        setStatus('Please wait for the public sale time')
        setMintLoading(false)
        return
      } else {
        hexProof = merkleTree.getHexProof(leafNodes[index])
      }
      try {
        let tx = await contract.preSaleMint(hexProof, {
          value: BigNumber.from(presalePrice),
        })
        let res = await tx.wait()
        if (res.transactionHash) {
          setStatus(`You minted ${amount} SON Successfully`)
          setMintLoading(false)
        }
      } catch (err) {
        let errorContainer =
          err.error && err.error.message ? err.error.message : ''
        let errorBody = errorContainer.substr(errorContainer.indexOf(':') + 1)
        let status =
          'Transaction failed because you have insufficient funds or sales not started'
        errorContainer.indexOf('execution reverted') === -1
          ? setStatus(status)
          : setStatus(errorBody)
        setMintLoading(false)
      }
    } else {
      setStatus(`Our Pre-Sale minting will begin on the 26th at 7pm UTC/3pm EST for anyone who is whitelisted.
      Our Public Sale minting begins on the 27th at 7pm UTC/3pm EST!`)
    }
    setMintLoading(false)
  }

  const notify = () =>
    toast.info(status, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    })

  return (
    <div className="App">
      <div className="main-div">
        <header className="nav-bar">
          <nav className="navbar navbar-light pt-4 col-md-10 mx-auto">
            <div className="container-fluid">
              <a className="navbar-brand" href="/">
                <span>Teddy</span>
                <span>Boy</span>
              </a>
              <div className="d-flex">
                <a
                  href="https://discord.com/"
                  rel="noreferrer"
                  target="_blank"
                  className="p-2 social-link"
                >
                  <img
                    src="img/discord.svg"
                    width="40px"
                    height="40px"
                    alt="discord"
                  />
                </a>
                <a
                  href="https://opensea.io/"
                  rel="noreferrer"
                  target="_blank"
                  className="p-2 social-link me-4"
                >
                  <img
                    src="img/opensea.png"
                    height="40px"
                    width="40px"
                    alt="OpenSea"
                  />
                </a>
                {walletAddress ? (
                  <button
                    className="btn custom-btn btn-secondary btn-lg"
                    type="button"
                    onClick={onClickDisconnectWallet}
                  >
                    {walletAddress.slice(0, 11)}...
                  </button>
                ) : (
                  <button
                    className="btn custom-btn btn-secondary btn-lg"
                    type="button"
                    onClick={onClickConnectWallet}
                  >
                    Connect Wallet
                  </button>
                )}
              </div>
            </div>
          </nav>
        </header>
        <section className="hero-section">
          <div className="hero-container">
            <h1 className="hero-head">
              <div className="mb-1">
                <span>Teddy </span>
                <span>Boy </span>
                <div>NFTs</div>
              </div>
            </h1>
          </div>
          <section className="mint-section">
            <div className="row col-lg-11 mx-auto justify-content-center align-items-center">
              <div className="col-md-4 col-lg-3">
                <h1 className="mint-title">Mint NFTs</h1>
                <img className="w-100" src="img/line.svg" alt="line" />
                <div className="row mx-0 my-4">
                  <div className="col-6 mb-4">
                    <div className="mint-info">{totalSupply} / 8888</div>
                    <div className="mint-subinfo">Total Supply</div>
                  </div>
                  <div className="col-6 mb-4">
                    <div className="mint-info">{curPrice} ETH</div>
                    <div className="mint-subinfo">Current NFT Price</div>
                  </div>
                  <div className="col-6 mb-4">
                    <div className="mint-info">5 NFTs</div>
                    <div className="mint-subinfo">Per Wallet</div>
                  </div>
                  <div className="col-6 mb-4">
                    <div className="mint-info">
                      {curPhase === 1
                        ? 'Dutch Auctions'
                        : curPhase === 2
                        ? 'Presale'
                        : curPhase === 3
                        ? 'Public Sale'
                        : 'Comming Soon!'}
                    </div>
                    <div className="mint-subinfo">Current Mint Phase</div>
                  </div>
                  <div className="col-6 mb-4">
                    <div className="mint-info">ERC 721a</div>
                    <div className="mint-subinfo">Low Gas Fees</div>
                  </div>
                </div>
                <div className="d-flex mb-2 main-mint">
                  <button onClick={decreaseAmount}>
                    <img src="img/minus.svg" alt="minus" />
                  </button>
                  <input
                    type="number"
                    className="custom-input"
                    min="1"
                    max="5"
                    value={amount}
                    onChange={changeAmount}
                  />
                  <button onClick={increaseAmount}>
                    <img src="img/plus.svg" alt="plus" />
                  </button>
                </div>
                <p className="wallet-err">Connect Metamask first</p>
                <div className="text-center text-md-start">
                  {loading ? (
                    <button
                      className="btn custom-btn my-4 btn-secondary btn-lg"
                      disabled={false}
                    >
                      {' '}
                      MINTING{' '}
                    </button>
                  ) : (
                    <button
                      className="btn custom-btn my-4 btn-secondary btn-lg"
                      onClick={handleMint}
                      disabled={false}
                    >
                      {' '}
                      MINT{' '}
                    </button>
                  )}
                </div>
              </div>
              <div className="col-md-6 col-lg-5">
                <div className="gif-container">
                  <img
                    className="w-100"
                    width="100%"
                    src="img/reactangleStar.svg"
                    alt="reactangleStar"
                    loading="lazy"
                  />
                  <div className="inner-img">
                    <img
                      className="w-100"
                      width="100%"
                      src="img/landGif.gif"
                      alt="Mint Img"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </section>
        <section className="slider-section">
          <div className="slider">
            <div className="slider-wrap">
              <div className="slide">
                <img
                  src="img/slide/1.png"
                  className="slide-image"
                  alt="slider0"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/2.png"
                  className="slide-image"
                  alt="slider1"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/3.png"
                  className="slide-image"
                  alt="slider2"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/4.png"
                  className="slide-image"
                  alt="slider3"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/5.png"
                  className="slide-image"
                  alt="slider4"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/6.png"
                  className="slide-image"
                  alt="slider5"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/7.png"
                  className="slide-image"
                  alt="slider6"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/8.png"
                  className="slide-image"
                  alt="slider7"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/9.png"
                  className="slide-image"
                  alt="slider8"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/10.png"
                  className="slide-image"
                  alt="slider9"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/11.png"
                  className="slide-image"
                  alt="slider10"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/12.png"
                  className="slide-image"
                  alt="slider11"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/13.png"
                  className="slide-image"
                  alt="slider12"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/14.png"
                  className="slide-image"
                  alt="slider13"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/15.png"
                  className="slide-image"
                  alt="slider14"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/16.png"
                  className="slide-image"
                  alt="slider15"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/17.png"
                  className="slide-image"
                  alt="slider16"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/18.png"
                  className="slide-image"
                  alt="slider17"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/19.png"
                  className="slide-image"
                  alt="slider18"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/20.png"
                  className="slide-image"
                  alt="slider19"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/21.png"
                  className="slide-image"
                  alt="slider20"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/22.png"
                  className="slide-image"
                  alt="slider21"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/23.png"
                  className="slide-image"
                  alt="slider22"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/24.png"
                  className="slide-image"
                  alt="slider23"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/25.png"
                  className="slide-image"
                  alt="slider24"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/26.png"
                  className="slide-image"
                  alt="slider25"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/27.png"
                  className="slide-image"
                  alt="slider26"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/28.png"
                  className="slide-image"
                  alt="slider27"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/29.png"
                  className="slide-image"
                  alt="slider28"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/30.png"
                  className="slide-image"
                  alt="slider29"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/31.png"
                  className="slide-image"
                  alt="slider30"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/32.png"
                  className="slide-image"
                  alt="slider31"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/33.png"
                  className="slide-image"
                  alt="slider32"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/34.png"
                  className="slide-image"
                  alt="slider33"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/35.png"
                  className="slide-image"
                  alt="slider34"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/36.png"
                  className="slide-image"
                  alt="slider35"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/37.png"
                  className="slide-image"
                  alt="slider36"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/38.png"
                  className="slide-image"
                  alt="slider37"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/39.png"
                  className="slide-image"
                  alt="slider38"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/40.png"
                  className="slide-image"
                  alt="slider39"
                />
              </div>
            </div>
            <div className="slider-wrap">
              <div className="slide">
                <img
                  src="img/slide/40.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/39.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/38.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/37.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/36.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/35.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/34.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/33.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/32.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/31.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/30.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/29.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/28.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/27.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/26.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/25.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/24.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/23.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/22.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/21.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/20.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/19.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/18.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/17.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/16.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/15.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/14.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/13.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/12.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/11.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/10.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/9.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/8.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/7.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/6.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/5.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/4.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/3.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/2.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
              <div className="slide">
                <img
                  src="img/slide/1.png"
                  className="slide-image"
                  alt="slider"
                />
              </div>
            </div>
          </div>
        </section>
        <section className="about-section">
          <div className="about-container">
            <h2 className="about-head">
              <span>About</span> <span>Teddy Boy</span>
            </h2>
            <p>
              From comics to movies, the story of "Teddy Boy" accompanies many
              Hong Kong people
              <br />
              and even global Chinese to grow together and witness the constant
              changes of the world environment.
            </p>
            <p>
              After the end of the comic, we are also thinking about how to
              continue the inheritance of "Teddy Boy".
              <br />
              So this year we decided to launch the "Young and Dangerous" NFT
              series to bring the culture and ideas of "Young and Dangerous" to
              the Metaverse,
              <br />
              and continue to promote the development of Hong Kong comics based
              on the development of Web3.0.
            </p>
            <h4 className="mt-4 fw-bolder">
              Are you ready for
              <span className="logo">
                <span>Teddy</span>
                <span>Boy</span>
              </span>
              ?
            </h4>
          </div>
        </section>
        <footer>
          <div className="d-flex justify-content-center align-items-center">
            <a href="https://discord.com/" className="p-2 social-link">
              <img
                src="img/discord.svg"
                height="40px"
                width="40px"
                alt="discord"
              />
            </a>
            <a className="logo px-5" href="/">
              <span>Teddy</span>
              <span>Boy</span>
            </a>
            <a href="https://opensea.io/" className="p-2 social-link">
              <img
                src="img/opensea.png"
                height="40px"
                width="40px"
                alt="OpenSea"
              />
            </a>
          </div>
        </footer>
      </div>
      <ToastContainer />
    </div>
  )
}

export default App
