from solution import maximum_xor


def test_maximum_xor_example_one():
    assert maximum_xor([3, 2, 4, 6]) == 7


def test_maximum_xor_example_two():
    assert maximum_xor([1, 2, 3, 9, 2]) == 11


def test_maximum_xor_single_zero():
    assert maximum_xor([0]) == 0


def test_maximum_xor_single_value():
    assert maximum_xor([5]) == 5


def test_maximum_xor_duplicates():
    assert maximum_xor([4, 4, 4]) == 4
