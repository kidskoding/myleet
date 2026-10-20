from solution import is_good_array


def test_is_good_array_example_one():
    assert is_good_array([12, 5, 7, 23]) is True


def test_is_good_array_example_two():
    assert is_good_array([29, 6, 10]) is True


def test_is_good_array_common_factor():
    assert is_good_array([3, 6]) is False


def test_is_good_array_contains_one():
    assert is_good_array([1]) is True


def test_is_good_array_single_large():
    assert is_good_array([6]) is False


def test_is_good_array_pairwise_not_coprime():
    assert is_good_array([6, 10, 15]) is True
