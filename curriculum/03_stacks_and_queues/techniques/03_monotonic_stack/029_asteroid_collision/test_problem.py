from solution import asteroid_collision


def test_asteroid_collision_normal_case():
    assert asteroid_collision([5, 10, -5]) == [5, 10]


def test_asteroid_collision_all_destroyed():
    assert asteroid_collision([8, -8]) == []


def test_asteroid_collision_single_asteroid():
    assert asteroid_collision([5]) == [5]


def test_asteroid_collision_empty():
    assert asteroid_collision([]) == []
