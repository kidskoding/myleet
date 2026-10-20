from solution import climbing_stairs


def test_climbing_stairs_base_cases():
    assert climbing_stairs(1) == 1
    assert climbing_stairs(2) == 2


def test_climbing_stairs_normal():
    assert climbing_stairs(5) == 8
