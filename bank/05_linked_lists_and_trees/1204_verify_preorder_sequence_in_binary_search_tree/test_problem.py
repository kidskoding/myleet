from solution import verify_preorder


def test_verify_preorder_valid():
    assert verify_preorder([5, 2, 1, 3, 6]) is True


def test_verify_preorder_invalid():
    assert verify_preorder([5, 2, 6, 1, 3]) is False


def test_verify_preorder_single():
    assert verify_preorder([7]) is True


def test_verify_preorder_increasing_chain():
    assert verify_preorder([1, 2, 3, 4]) is True


def test_verify_preorder_decreasing_chain():
    assert verify_preorder([4, 3, 2, 1]) is True


def test_verify_preorder_violates_ancestor_bound():
    assert verify_preorder([4, 2, 3, 1]) is False


def test_verify_preorder_deep_valid():
    assert verify_preorder([8, 5, 1, 7, 10, 12]) is True
