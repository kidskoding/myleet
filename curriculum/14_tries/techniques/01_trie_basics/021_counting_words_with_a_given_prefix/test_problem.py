from solution import prefix_count


def test_prefix_count_normal():
    assert prefix_count(["pay", "attention", "practice", "attend"], "at") == 2


def test_prefix_count_none_match():
    assert prefix_count(["leetcode", "win", "loops", "success"], "code") == 0


def test_prefix_count_full_word_prefix():
    assert prefix_count(["apple", "app", "apricot"], "app") == 2


def test_prefix_count_single_word():
    assert prefix_count(["hello"], "hello") == 1
