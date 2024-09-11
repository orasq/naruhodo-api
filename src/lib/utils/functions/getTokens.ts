import { getTokenizer, tokenize, type KuromojiToken } from 'kuromojin';
import type { BatchItem } from '../../types/types';

type SkippableKuromojiToken = KuromojiToken & { skip: boolean };

export async function getTokens(paragraphs: BatchItem[]) {
  // Initialize tokenizer
  await getTokenizer();

  const parsedParagraphs = await Promise.all(
    paragraphs.map(async (paragraph) => {
      const tokens = reduceParsedParagraphs(await tokenize(paragraph.baseText));
      return { ...paragraph, tokens: tokens };
    }),
  );

  return parsedParagraphs;
}

function reduceParsedParagraphs(parsedParagraphs: KuromojiToken[]) {
  return (parsedParagraphs as SkippableKuromojiToken[]).reduce(
    (acc: KuromojiToken[] | [], curr, index, baseArray) => {
      // skip current item if applicable
      if (curr.skip) return acc;

      // merge current item with next one
      if (
        baseArray[index + 1] &&
        shouldMergeWithNext(curr, baseArray[index + 1])
      ) {
        const nextWord = baseArray[index + 1];

        if (!nextWord) return [...acc, curr];

        const newSurfaceForm = curr.surface_form + nextWord.surface_form;

        // don't handle next word
        baseArray[index + 1] = { ...nextWord, skip: true };

        return [...acc, { ...curr, surface_form: newSurfaceForm }];
      }

      // merge current item with previous one
      if (shouldMergeWithPrev(curr)) {
        // remove previous item from acc
        const prevWord = acc.pop();

        if (!prevWord) return [...acc, curr];

        const newSurfaceWord = prevWord.surface_form + curr.surface_form;

        return [...acc, { ...prevWord, surface_form: newSurfaceWord }];
      }

      return [...acc, curr];
    },
    [],
  );
}

function shouldMergeWithNext(token: KuromojiToken, nextToken: KuromojiToken) {
  if (
    ['連用形', '未然形', '連用タ接続'].includes(token.conjugated_form) &&
    nextToken.pos === '助動詞'
  )
    return true;

  if (
    ['未然形'].includes(token.conjugated_form) &&
    nextToken.pos_detail_1 === '接尾'
  )
    return true;

  if (
    ['連用タ接続', '連用形'].includes(token.conjugated_form) &&
    nextToken.pos_detail_1 === '接続助詞'
  )
    return true;

  if (
    token.basic_form === 'ん' &&
    token.pos_detail_1 === '非自立' &&
    nextToken.basic_form === 'です'
  )
    return true;

  return false;
}

function shouldMergeWithPrev(token: KuromojiToken) {
  if (token.pos === '助動詞' && token.conjugated_form === '体言接続')
    return true;

  if (token.pos_detail_1 === '接尾' && token.pos_detail_2 === '助数詞')
    return true;

  if (
    token.pos === '動詞' &&
    token.conjugated_type === '一段' &&
    token.pos_detail_1 === '非自立'
  )
    return true;

  // (token.pos === "助動詞" && token.conjugated_form === "基本形") ||
  // (token.pos === "助詞" && token.pos_detail_2 === "連語") ||
  // (token.pos === "助詞" && token.pos_detail_1 === "接続助詞") ||

  return false;
}
