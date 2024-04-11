function makeid() {
  let result = "";
  let result1 = "";
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz123456789";
  const charactersLength = characters.length;
  for (var i = 0; i < 3; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  for (var i = 0; i < 3; i++) {
    result1 += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result + " " + result1;
}

module.exports = makeid;
