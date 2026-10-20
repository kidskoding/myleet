from solution import single_number_iii


def test_single_number_iii_normal():
    assert sorted(single_number_iii([1, 2, 1, 3, 2, 5])) == [3, 5]


def test_single_number_iii_two_elements():
    assert sorted(single_number_iii([-1, 0])) == [-1, 0]
