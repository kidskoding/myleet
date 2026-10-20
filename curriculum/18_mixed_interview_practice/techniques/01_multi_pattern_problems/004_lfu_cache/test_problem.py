from solution import LFUCache


def test_lfu_cache_evicts_least_frequent():
    cache = LFUCache(2)
    cache.put(1, 1)
    cache.put(2, 2)

    assert cache.get(1) == 1
    cache.put(3, 3)
    assert cache.get(2) == -1
    assert cache.get(3) == 3
    cache.put(4, 4)
    assert cache.get(1) == -1
    assert cache.get(3) == 3
    assert cache.get(4) == 4


def test_lfu_cache_zero_capacity():
    cache = LFUCache(0)
    cache.put(1, 1)

    assert cache.get(1) == -1


def test_lfu_cache_update_existing_key():
    cache = LFUCache(2)
    cache.put(1, 1)
    cache.put(1, 5)

    assert cache.get(1) == 5
