from solution import find_lonely


def test_find_lonely_example_one():
    assert sorted(find_lonely([10, 6, 5, 8])) == [8, 10]


def test_find_lonely_example_two():
    assert sorted(find_lonely([1, 3, 5, 3])) == [1, 5]


def test_find_lonely_single():
    assert find_lonely([1]) == [1]


def test_find_lonely_duplicates_never_lonely():
    assert find_lonely([1, 1]) == []


def test_find_lonely_all_adjacent():
    assert find_lonely([1, 2, 3]) == []


def test_find_lonely_zero_and_gap():
    assert sorted(find_lonely([0, 2])) == [0, 2]
