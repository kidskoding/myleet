from solution import frequency_sort


def test_frequency_sort_keeps_the_same_letters():
    result = frequency_sort("tree")

    assert sorted(result) == sorted("tree")


def test_frequency_sort_groups_each_letter_together():
    result = frequency_sort("cccaaa")

    assert sorted(result) == sorted("cccaaa")
    assert len(set(result[i] for i in range(len(result)))) == 2
    assert result[0] == result[1] == result[2]
    assert result[3] == result[4] == result[5]


def test_frequency_sort_orders_by_descending_count():
    result = frequency_sort("Aabb")
    counts = [result.count(ch) for ch in result]

    assert sorted(result) == sorted("Aabb")
    assert counts == sorted(counts, reverse=True)
