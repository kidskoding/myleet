from list_node import ListNode
from solution import twin_sum


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def test_twin_sum_normal():
    assert twin_sum(build_list([5, 4, 2, 1])) == 6


def test_twin_sum_middle_pair_wins():
    assert twin_sum(build_list([4, 2, 2, 3])) == 7


def test_twin_sum_two_nodes():
    assert twin_sum(build_list([1, 100000])) == 100001
