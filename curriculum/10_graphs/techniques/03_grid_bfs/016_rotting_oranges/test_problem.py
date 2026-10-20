from solution import oranges_rotting


def test_oranges_rotting_normal_case():
    assert oranges_rotting([[2, 1, 1], [1, 1, 0], [0, 1, 1]]) == 4


def test_oranges_rotting_impossible():
    assert oranges_rotting([[2, 1, 1], [0, 1, 1], [1, 0, 1]]) == -1


def test_oranges_rotting_no_fresh_oranges():
    assert oranges_rotting([[0, 2]]) == 0
