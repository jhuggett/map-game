#!/usr/bin/env node

import { TerminalInterface } from "./Terminal/terminal-interface"
import { Coor } from "./Utils/Coordinate"

(() => {
  
  const term = TerminalInterface.interactor
  const { cursor } = term


  term.clearScreen()
  term.write("Test")
})()