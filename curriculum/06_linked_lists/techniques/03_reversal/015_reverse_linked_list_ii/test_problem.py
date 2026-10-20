from list_node import ListNode
from solution import reverse_between


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


def test_reverse_between_middle():
    head = build_list([1, 2, 3, 4, 5])
    assert to_list(reverse_between(head, 2, 4)) == [1, 4, 3, 2, 5]


def test_reverse_between_from_head():
    head = build_list([1, 2, 3])
    assert to_list(reverse_between(head, 1, 3)) == [3, 2, 1]


def test_reverse_between_single_span():
    head = build_list([1, 2, 3])
    assert to_list(reverse_between(head, 2, 2)) == [1, 2, 3]
