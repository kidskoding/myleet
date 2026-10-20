from solution import max_height


def test_max_height_example_one():
    assert max_height([[50, 45, 20], [95, 37, 53], [45, 23, 12]]) == 190


def test_max_height_cannot_stack():
    assert max_height([[38, 25, 45], [76, 35, 3]]) == 76


def test_max_height_all_rotations_identical():
    cuboids = [[7, 11, 17], [7, 17, 11], [11, 7, 17], [11, 17, 7], [17, 7, 11], [17, 11, 7]]
    assert max_height(cuboids) == 102


def test_max_height_single():
    assert max_height([[1, 2, 3]]) == 3


def test_max_height_identical_cubes():
    assert max_height([[2, 2, 2], [2, 2, 2]]) == 4
