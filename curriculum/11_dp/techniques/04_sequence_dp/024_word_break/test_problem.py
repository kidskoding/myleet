from solution import word_break


def test_word_break_true():
    assert word_break("leetcode", ["leet", "code"]) is True


def test_word_break_false():
    assert word_break("catsandog", ["cats", "dog", "sand", "and", "cat"]) is False


def test_word_break_empty():
    assert word_break("", ["a"]) is True
