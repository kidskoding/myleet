from solution import count_words


def test_count_words_mixed():
    assert count_words(["leetcode", "is", "amazing", "as", "is"], ["amazing", "leetcode", "is"]) == 2


def test_count_words_disjoint():
    assert count_words(["b", "bb", "bbb"], ["a", "aa", "aaa"]) == 0


def test_count_words_repeated_in_second():
    assert count_words(["a", "ab"], ["a", "a", "a", "ab"]) == 1


def test_count_words_repeated_in_both():
    assert count_words(["a", "a"], ["a", "a"]) == 0


def test_count_words_single_shared():
    assert count_words(["x"], ["x"]) == 1
