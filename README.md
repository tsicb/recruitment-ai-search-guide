# Recruitment AI Search Guide

企業の採用サイトをテーマに、AI検索とLLMOを「デジタル科学館」のように分かりやすく学べるGitHub Pagesサイトです。

## Concept

- AI検索の仕組みは、採用領域に限定しすぎず一般原理として説明
- 具体例は採用サイト・求人情報に統一
- 「検索者・AI・Web情報・情報発信者」のつながりを俯瞰
- 6つの関門で、情報がAI回答へ届くまでの情報損失を整理
- 初学者でも全体像を見失わない固定ナビゲーション
- 詳しい説明はクリックで掘れる「デジタル科学館」型UI

## Six Gates

1. 見つけられる？ / Findable
2. 何の情報か分かる？ / Understandable
3. この質問と関係ある？ / Relevant
4. 答えを取り出せる？ / Extractable
5. 信じて使える？ / Trustworthy
6. 正しく伝えられる？ / Representable

## Structure

- `index.html` : ページ全体
- `css/style.css` : レイアウト・レスポンシブUI
- `js/app.js` : ナビ、JSON描画、ヒートマップ、詳細ドロワー
- `data/gates.json` : 6つの関門
- `data/measures.json` : LLMO施策5群
- `data/matrix.json` : 6関門 × 5施策群
- `data/glossary.json` : 用語集

## GitHub Pages

Repository の **Settings → Pages** を開き、

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

を選択して保存します。

## Current Version

v0.1 skeleton

現在は「全体像を見て理解できること」を優先した初期版です。
今後、情報設計・具体例・インタラクション・視覚表現を段階的に磨いていきます。
