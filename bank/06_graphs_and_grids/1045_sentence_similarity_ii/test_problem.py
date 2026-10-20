from solution import are_sentences_similar_two


def test_are_sentences_similar_two_through_shared_word():
    pairs = [["great", "good"], ["fine", "good"], ["drama", "acting"], ["skills", "talent"]]
    assert are_sentences_similar_two(["great", "acting", "skills"], ["fine", "drama", "talent"], pairs) is True


def test_are_sentences_similar_two_long_chain():
    pairs = [["manga", "onepiece"], ["platform", "anime"], ["leetcode", "platform"], ["anime", "manga"]]
    assert are_sentences_similar_two(["I", "love", "leetcode"], ["I", "love", "onepiece"], pairs) is True


def test_are_sentences_similar_two_broken_chain():
    pairs = [["manga", "hunterXhunter"], ["platform", "anime"], ["leetcode", "platform"], ["anime", "manga"]]
    assert are_sentences_similar_two(["I", "love", "leetcode"], ["I", "love", "onepiece"], pairs) is False


def test_are_sentences_similar_two_different_lengths():
    assert are_sentences_similar_two(["a", "b"], ["a"], []) is False


def test_are_sentences_similar_two_identical_without_pairs():
    assert are_sentences_similar_two(["same", "words"], ["same", "words"], []) is True


def test_are_sentences_similar_two_unrelated_words():
    assert are_sentences_similar_two(["x"], ["y"], [["x", "z"]]) is False
