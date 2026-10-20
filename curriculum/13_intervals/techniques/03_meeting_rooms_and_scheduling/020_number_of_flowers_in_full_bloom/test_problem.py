from solution import full_bloom_flowers


def test_full_bloom_flowers_normal():
    flowers = [[1, 6], [3, 7], [9, 12], [4, 13]]
    assert full_bloom_flowers(flowers, [2, 3, 7, 11]) == [1, 2, 2, 2]


def test_full_bloom_flowers_repeated_queries():
    assert full_bloom_flowers([[1, 10], [3, 3]], [3, 3, 2]) == [2, 2, 1]
