from collections import Counter

from solution import RandomizedCollection


def test_randomized_collection_example():
    rc = RandomizedCollection()
    assert rc.insert(1) is True
    assert rc.insert(1) is False
    assert rc.insert(2) is True
    assert rc.get_random() in (1, 2)
    assert rc.remove(1) is True
    assert rc.get_random() in (1, 2)


def test_randomized_collection_remove_missing():
    rc = RandomizedCollection()
    assert rc.remove(5) is False
    rc.insert(5)
    assert rc.remove(5) is True
    assert rc.remove(5) is False


def test_randomized_collection_single_value():
    rc = RandomizedCollection()
    rc.insert(4)
    rc.insert(9)
    rc.remove(4)
    assert all(rc.get_random() == 9 for _ in range(20))


def test_randomized_collection_insert_after_full_removal_is_fresh():
    rc = RandomizedCollection()
    rc.insert(3)
    rc.insert(3)
    rc.remove(3)
    rc.remove(3)
    assert rc.insert(3) is True


def test_randomized_collection_many_swaps_keep_contents():
    rc = RandomizedCollection()
    for v in [1, 2, 1, 3, 2, 1, 4]:
        rc.insert(v)
    for v in [1, 4, 2, 1]:
        assert rc.remove(v) is True
    seen = {rc.get_random() for _ in range(200)}
    assert seen == {1, 2, 3}


def test_randomized_collection_weighted_by_duplicates():
    rc = RandomizedCollection()
    for v in [1, 1, 2]:
        rc.insert(v)
    counts = Counter(rc.get_random() for _ in range(3000))
    assert 0.55 < counts[1] / 3000 < 0.78
