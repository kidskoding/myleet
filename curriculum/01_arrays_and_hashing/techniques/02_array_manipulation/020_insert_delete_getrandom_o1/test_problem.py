from solution import RandomizedSet


def test_randomized_set_insert_and_remove():
    randomized_set = RandomizedSet()
    assert randomized_set.insert(1) is True
    assert randomized_set.insert(1) is False
    assert randomized_set.remove(1) is True
    assert randomized_set.remove(1) is False


def test_randomized_set_get_random_returns_inserted_value():
    randomized_set = RandomizedSet()
    randomized_set.insert(42)
    assert randomized_set.get_random() == 42


def test_randomized_set_remove_missing_value():
    randomized_set = RandomizedSet()
    assert randomized_set.remove(99) is False
