from solution import num_of_pairs


def test_num_of_pairs_example_sevens():
    assert num_of_pairs(["777", "7", "77", "77"], "7777") == 4


def test_num_of_pairs_example_ordered():
    assert num_of_pairs(["123", "4", "12", "34"], "1234") == 2


def test_num_of_pairs_example_all_same():
    assert num_of_pairs(["1", "1", "1"], "11") == 6


def test_num_of_pairs_no_match():
    assert num_of_pairs(["1", "2"], "33") == 0


def test_num_of_pairs_duplicate_prefix():
    assert num_of_pairs(["12", "12", "3"], "123") == 2
