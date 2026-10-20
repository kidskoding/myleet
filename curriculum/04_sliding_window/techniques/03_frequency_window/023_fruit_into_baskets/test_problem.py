from solution import total_fruit


def test_total_fruit_single_tree():
    assert total_fruit([1]) == 1


def test_total_fruit_all_same_two_types():
    assert total_fruit([1, 2, 1]) == 3


def test_total_fruit_normal():
    assert total_fruit([0, 1, 2, 2]) == 3


def test_total_fruit_normal_two():
    assert total_fruit([1, 2, 3, 2, 2]) == 4
