from solution import top_k_frequent_words


def test_top_k_frequent_words_normal():
    words = ["i", "love", "leetcode", "i", "love", "coding"]
    assert top_k_frequent_words(words, 2) == ["i", "love"]


def test_top_k_frequent_words_tie_break_alphabetical():
    words = ["the", "day", "is", "sunny", "the", "the", "sunny", "is", "is"]
    assert top_k_frequent_words(words, 4) == ["the", "is", "sunny", "day"]


def test_top_k_frequent_words_single():
    assert top_k_frequent_words(["a"], 1) == ["a"]
