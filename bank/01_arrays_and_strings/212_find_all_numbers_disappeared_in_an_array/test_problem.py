from solution import find_disappeared_numbers


def test_find_disappeared_numbers_example():
    assert sorted(find_disappeared_numbers([4, 3, 2, 7, 8, 2, 3, 1])) == [5, 6]


def test_find_disappeared_numbers_duplicate_pair():
    assert sorted(find_disappeared_numbers([1, 1])) == [2]


def test_find_disappeared_numbers_none_missing():
    assert find_disappeared_numbers([3, 1, 2]) == []


def test_find_disappeared_numbers_all_same():
    assert sorted(find_disappeared_numbers([2, 2, 2])) == [1, 3]


def test_find_disappeared_numbers_single():
    assert find_disappeared_numbers([1]) == []
