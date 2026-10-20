from list_node import ListNode
from solution import swap_pairs


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def to_list(head: ListNode | None) -> list[int]:
    values = []
    while head:
        values.append(head.val)
        head = head.next
    return values


def test_swap_pairs_even():
    assert to_list(swap_pairs(build_list([1, 2, 3, 4]))) == [2, 1, 4, 3]


def test_swap_pairs_odd_leaves_last():
    assert to_list(swap_pairs(build_list([1, 2, 3]))) == [2, 1, 3]


def test_swap_pairs_empty():
    assert swap_pairs(None) is None
