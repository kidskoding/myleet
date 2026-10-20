from solution import num_ways


def test_num_ways_example_aba():
    assert num_ways(["acca", "bbbb", "caca"], "aba") == 6


def test_num_ways_example_bab():
    assert num_ways(["abba", "baab"], "bab") == 4


def test_num_ways_target_longer_than_words():
    assert num_ways(["ab"], "abc") == 0


def test_num_ways_single_letter_target():
    assert num_ways(["aaa", "aaa"], "a") == 6


def test_num_ways_letter_missing():
    assert num_ways(["abc", "bca"], "z") == 0
