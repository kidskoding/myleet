from solution import maximum_sum


def test_maximum_sum_example_one():
    assert maximum_sum([18, 43, 36, 13, 7]) == 54


def test_maximum_sum_no_pair():
    assert maximum_sum([10, 12, 19, 14]) == -1


def test_maximum_sum_same_digit_sum():
    assert maximum_sum([51, 71, 17, 42]) == 93


def test_maximum_sum_single():
    assert maximum_sum([5]) == -1


def test_maximum_sum_ties():
    assert maximum_sum([9, 18, 27]) == 45
