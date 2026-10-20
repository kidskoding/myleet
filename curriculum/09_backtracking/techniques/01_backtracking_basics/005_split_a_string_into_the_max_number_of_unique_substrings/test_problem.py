from solution import max_unique_split


def test_max_unique_split_normal():
    assert max_unique_split("ababccc") == 5


def test_max_unique_split_short():
    assert max_unique_split("aba") == 2


def test_max_unique_split_all_same():
    assert max_unique_split("aa") == 1
