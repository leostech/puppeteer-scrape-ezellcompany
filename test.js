var fs = require("fs");
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const repl = require('puppeteer-extra-plugin-repl')({ addToPuppeteerClass: false })
const path = require("path");

puppeteer.use(StealthPlugin())

async function scrape(){

  const browser = await puppeteer.launch({ headless: true });

  const defaultPage =  await browser.newPage()
  defaultPage.setDefaultNavigationTimeout(0);

  let defaultURL = "http://ezellcompany.com/products"

  await defaultPage.goto(defaultURL)
  await defaultPage.waitForSelector('.subnav');

  let result = "Product Name, Color, Size, Category, Description, Specifications, Features, Price, Image"

  let categories = await defaultPage.$$eval(".subnav > ul > li > a", options => {
    return options.map(option => {
      return {href:option.href, text:option.innerText}});
  });

  // go to category
  for(let catIdx = 0; catIdx < categories.length; catIdx++ ) {

    let category = categories[catIdx]
    console.log("Category : "+catIdx)

    let subs = await defaultPage.$$eval(`.subnav > ul > li:nth-child(${catIdx+1}) > ul > li > a`, options => {
      return options.map(option => {
        return {href:option.href, text:option.innerText}});
    });

    console.log(subs)
    // go to subcategory.
    for(let subIdx = 0; subIdx < subs.length; subIdx++){
      console.log("Subcategory:" + subIdx)
      let sub = subs[subIdx]

        let productHrefs = []
        
        try {
          console.log("try=================>"+sub.href)
          await defaultPage.goto(sub.href)
          await defaultPage.waitForSelector("div.product-catalog")
          productHrefs = await defaultPage.$$eval(".product > a", options => {
            return options.map(option => option.href);
          });
        } catch(err) {
          productHrefs.push(sub.href)
        }

        // go to product.
        for(let productIdx = 0; productIdx < productHrefs.length; productIdx++){
          console.log("Product:" + productIdx)
          let product = productHrefs[productIdx]

          await defaultPage.goto(product)
          await defaultPage.waitForSelector(".product-content")
          let title = await defaultPage.$eval(".product-content > .product > .title", option => option.innerText )
          let text = await defaultPage.$eval(".product-description", option => option.innerText)
          let price = await defaultPage.$eval(".product-content > .product > .product-price > data", option => option.innerText )
          const imgUrl = await defaultPage.$eval('.product-image', img => img.src);
          const fileName = imgUrl.split("/").pop()
          console.log(fileName + " downloaded.")

         var viewSource = await defaultPage.goto(imgUrl);
          fs.writeFile(path.join(__dirname,"downloads",fileName), await viewSource.buffer(), function (err) {
          if (err) {
              return console.log(err);
          }})          
          console.log(text)

          // get result data
           var re = new RegExp(String.fromCharCode(160), "g");

           var re_2 = new RegExp(/\n\n\s/, "g")
           text = text.replace(re, "")
           text = text.replace(re_2, " ")

           let splits = text.split(/\n{4,}/)
           let row = text
           // let temp = text.split("Features:")

           // let desc = splits[0] || ""
           // let features = splits[1] || ""
           // let specs = splits[2] || ""

           // features = features.split(/\n{2,}/).filter(el => el.toLowerCase() != "Features:".toLowerCase()).join("\t")
           // specs = specs.split(/\n{2,}/).filter(el => el.toLowerCase() != "Specifications:".toLowerCase()).join("\t")

           // let row = title + "," + "" + "," + "" +","+ category.text + "," + desc + "," + specs + "," + features + "," + price + "," +fileName + "\n"
          
            // console.log(row)
            result += row
            result += "\n===========================\n"
              try{
              fs.writeFileSync("result.txt", result)
            } catch (err) {
              console.log(err)
            }
        }
    }
  }
  await browser.close();
}

 scrape()
