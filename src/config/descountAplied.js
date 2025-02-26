export const AplieDescount = (number) => {

    const value = parseFloat(number)

    const increseTax = Math.ceil(value * 0.25 + value)
    const descreaseTw = Math.floor(increseTax - increseTax * 0.2)
    const descreaseThird = Math.floor(increseTax - increseTax * 0.3)
    const decreaseFifteen = Math.floor(increseTax - increseTax * 0.15)

    return {
        increseTax,
        descreaseTw,
        descreaseThird,
        decreaseFifteen,
    }


}