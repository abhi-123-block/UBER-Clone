import React from 'react'
import { Link } from 'react-router-dom'
import uberLogo from '../assets/uber logo.png'
import heroImg from '../assets/hero.png'

const Home = () => {
  return (
    <div className="h-screen w-full flex flex-col bg-black overflow-hidden">
      {/* Hero */}
      <div className="relative flex-1 flex flex-col">
        <img src={uberLogo} alt="Uber" className="w-20 ml-6 mt-6 invert relative z-10" />
        <img
          src={heroImg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
      </div>

      {/* Bottom sheet */}
      <div className="bg-white rounded-t-3xl px-6 pt-6 pb-8">
        <h2 className="text-2xl font-medium leading-snug">
          Get moving with Uber
        </h2>
        <p className="text-gray-500 mt-1 text-sm">
          Request a ride, hop in, and go.
        </p>

        <Link
          to="/login"
          className="mt-6 flex items-center justify-center w-full bg-black text-white py-3 rounded-lg text-base font-medium active:opacity-80 transition-opacity"
        >
          Continue as a rider
        </Link>

        <Link
          to="/captain-login"
          className="mt-3 flex items-center justify-center w-full border border-gray-300 text-black py-3 rounded-lg text-base font-medium active:opacity-80 transition-opacity"
        >
          Continue as a captain
        </Link>
      </div>
    </div>
  )
}

export default Home
