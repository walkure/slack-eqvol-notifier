# slack-eqvol-notifier

気象庁が配信している[気象庁防災情報XML](http://xml.kishou.go.jp/)のうち地震に関する情報を読んで、概要をSlackに投げます。

node.js の勉強がてら書いてみました。

## 表示例

![震源に関する情報](https://i.gyazo.com/b43d0ebfc3022f8ff96240830c0b862b.png)

「きょう２２日」って不思議な感じですけど、配信されている[電文の見出し文](http://agora.ex.nii.ac.jp/cgi-bin/cps/report_each.pl?id=82e91d00-d961-3cc0-91ed-80684e03ecd0)をそのまま表示しています。

自力で各地の震度を地図に描くのは面倒だったので、[Yahoo!](https://typhoon.yahoo.co.jp/weather/jp/earthquake/)や[tenki.jp](https://earthquake.tenki.jp/bousai/earthquake/entries/)の当該情報を参照するボタンとtenki.jpの画像を貼ってお茶を濁しています。

## ファイル

- jmapull.js
  - [XML feed](http://xml.kishou.go.jp/xmlpull.html)を取って来るbot
- jmaparser.js
  - index.js / jmapull.js から呼ばれて情報をSlackに投げる
- package.json
- npm のパッケージ
- config/
  - [node-config](https://www.npmjs.com/package/node-config)で読む設定が入ります

## 使い方

- npm installで依存するパッケージを入れる
- config/以下のjsonを適当に書く
  - Slackのincoming Webhook URIとチャンネルを書きます
- 起動
  - ` node ./jmapull.js `

### Dockerでの起動

`docker run -it --rm --mount type=bind,source=/usr/local/slack-eqvol-notifier/config,target=/config,readonly ghcr.io/walkure/slack-eqvol-notifier:1.0.0`

`NODE_ENV=production`で起動するので、設定ファイルは`production.json`を読みます。

## Author

walkure at 3pf.jp

## License

MIT
