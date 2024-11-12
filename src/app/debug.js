

export const log = (d, m) => {
    console.log({
        message: [`${m.toUpperCase()}`],
        data: JSON.stringify(d, null, 2)
    })
}