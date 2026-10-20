from solution import find_valid_pair


def test_find_valid_pair_example_one():
    assert find_valid_pair("2523533") == "23"


def test_find_valid_pair_example_two():
    assert find_valid_pair("221") == "21"


def test_find_valid_pair_equal_digits():
    assert find_valid_pair("22") == ""


def test_find_valid_pair_count_mismatch():
    assert find_valid_pair("12") == ""


def test_find_valid_pair_first_from_left():
    assert find_valid_pair("1223") == "12"


def test_find_valid_pair_skips_equal_neighbors():
    assert find_valid_pair("333122") == "31"
