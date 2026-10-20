from solution import MyHashMap


def test_my_hash_map_put_and_get():
    hash_map = MyHashMap()
    hash_map.put(1, 1)
    hash_map.put(2, 2)

    assert hash_map.get(1) == 1
    assert hash_map.get(3) == -1


def test_my_hash_map_overwrites_existing_key():
    hash_map = MyHashMap()
    hash_map.put(2, 2)
    hash_map.put(2, 1)

    assert hash_map.get(2) == 1


def test_my_hash_map_remove():
    hash_map = MyHashMap()
    hash_map.put(2, 1)
    hash_map.remove(2)

    assert hash_map.get(2) == -1
