from solution import amount_painted


def test_amount_painted_overlapping():
    assert amount_painted([[1, 4], [4, 7], [5, 8]]) == [3, 3, 1]


def test_amount_painted_out_of_order():
    assert amount_painted([[1, 4], [5, 8], [4, 7]]) == [3, 3, 1]
