from solution import plus_one


def test_plus_one_no_carry():
    assert plus_one([1, 2, 3]) == [1, 2, 4]


def test_plus_one_single_carry():
    assert plus_one([9]) == [1, 0]


def test_plus_one_cascading_carry():
    assert plus_one([9, 9]) == [1, 0, 0]
