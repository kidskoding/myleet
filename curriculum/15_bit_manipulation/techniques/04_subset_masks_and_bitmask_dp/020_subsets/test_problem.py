from solution import subsets


def test_subsets_empty_input():
    assert subsets([]) == [[]]


def test_subsets_single_element():
    result = {tuple(sorted(s)) for s in subsets([1])}
    assert result == {(), (1,)}


def test_subsets_normal():
    result = {tuple(sorted(s)) for s in subsets([1, 2, 3])}
    expected = {
        (),
        (1,),
        (2,),
        (3,),
        (1, 2),
        (1, 3),
        (2, 3),
        (1, 2, 3),
    }
    assert result == expected
